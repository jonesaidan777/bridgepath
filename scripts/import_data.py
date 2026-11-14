"""Read the MVP workbook without third-party packages or modifying the source.

Only literal cell values are supported. Formula cells fail explicitly rather than
silently importing a possibly stale cached result.
"""
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import posixpath
import tempfile
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
SCHEMA = {
    "Internships": ["internship_id", "company", "job_title", "job_description_summary", "career_field", "location", "employer_posting_url", "retrieved_on", "posting_status"],
    "Requirements": ["internship_id", "skill_id", "requirement_type", "evidence_excerpt"],
    "Skills": ["skill_id", "skill_name"],
    "Projects": ["project_id", "career_field", "title", "description", "target_skill_ids", "final_deliverable"],
    "Milestones": ["milestone_id", "project_id", "step_number", "title", "instructions", "deliverable", "resource_title", "resource_url"],
}


def column_index(reference):
    index = 0
    for char in reference:
        if not char.isalpha():
            break
        index = index * 26 + ord(char.upper()) - ord("A") + 1
    return index - 1


def read_workbook(path):
    with zipfile.ZipFile(path) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {r.attrib["Id"]: r.attrib["Target"] for r in relationships}
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(t.text or "" for t in item.iter(f"{{{NS['m']}}}t"))
                       for item in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        properties = workbook.find("m:workbookPr", NS)
        date1904 = properties is not None and properties.get("date1904") in ("1", "true")
        result = {}
        for sheet in workbook.findall("m:sheets/m:sheet", NS):
            name = sheet.attrib["name"]
            if name not in SCHEMA:
                continue
            target = targets[sheet.attrib[f"{{{REL}}}id"]]
            target = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            rows = []
            for row in ET.fromstring(archive.read(target)).findall("m:sheetData/m:row", NS):
                cells = {}
                for cell in row.findall("m:c", NS):
                    if cell.find("m:f", NS) is not None:
                        raise ValueError(f"{name}!{cell.get('r')}: formula cells are unsupported; use a literal value")
                    kind = cell.get("t")
                    value_node = cell.find("m:v", NS)
                    value = value_node.text if value_node is not None else None
                    if kind == "s" and value is not None:
                        value = strings[int(value)]
                    elif kind == "inlineStr":
                        value = "".join(t.text or "" for t in cell.findall("m:is//m:t", NS))
                    elif kind == "e":
                        raise ValueError(f"{name}!{cell.get('r')}: Excel error {value}")
                    cells[column_index(cell.attrib["r"])] = value if value != "" else None
                if any(value is not None for value in cells.values()):
                    rows.append(cells)
            if not rows:
                raise ValueError(f"{name}: missing header row")
            header_cells = rows.pop(0)
            headers = [header_cells.get(i) for i in range(max(header_cells) + 1)]
            if None in headers or len(headers) != len(set(headers)):
                raise ValueError(f"{name}: blank or duplicate column names")
            missing = set(SCHEMA[name]) - set(headers)
            if missing:
                raise ValueError(f"{name}: missing columns {sorted(missing)}")
            records = []
            for cells in rows:
                if any(i >= len(headers) and value is not None for i, value in cells.items()):
                    raise ValueError(f"{name}: data without a column header")
                record = {header: cells.get(i) for i, header in enumerate(headers)}
                # Excel stores date-formatted cells as serial numbers; text ISO dates
                # from the supplied workbook are preserved exactly.
                if name == "Internships" and record["retrieved_on"] is not None:
                    value = record["retrieved_on"]
                    try:
                        serial = float(value)
                    except ValueError:
                        datetime.strptime(value, "%Y-%m-%d")
                    else:
                        epoch = datetime(1904, 1, 1) if date1904 else datetime(1899, 12, 30)
                        record["retrieved_on"] = (epoch + timedelta(days=serial)).date().isoformat()
                if name == "Milestones" and record["step_number"] is not None:
                    number = float(record["step_number"])
                    if not number.is_integer() or number < 1:
                        raise ValueError("Milestones: step_number must be a positive integer or blank")
                    record["step_number"] = int(number)
                records.append(record)
            result[name] = records
        if set(result) != set(SCHEMA):
            raise ValueError(f"Missing worksheets: {sorted(set(SCHEMA) - set(result))}")
        return result


def validate(data):
    warnings = []
    indexes = {}
    for sheet, key in [("Internships", "internship_id"), ("Skills", "skill_id"), ("Projects", "project_id"), ("Milestones", "milestone_id")]:
        ids = [row[key] for row in data[sheet]]
        if any(not isinstance(value, str) or not value.strip() or value != value.strip() for value in ids):
            raise ValueError(f"{sheet}: missing ID or whitespace around an ID")
        if len(set(ids)) != len(ids):
            raise ValueError(f"{sheet}: duplicate {key}")
        indexes[sheet] = set(ids)
    for row in data["Requirements"]:
        if row["internship_id"] not in indexes["Internships"] or row["skill_id"] not in indexes["Skills"]:
            raise ValueError(f"Requirements: broken reference {row}")
        if row["requirement_type"] not in (None, "required", "preferred", "unspecified"):
            raise ValueError(f"Requirements: unknown requirement_type {row['requirement_type']}")
        if not row["evidence_excerpt"]:
            warnings.append(f"Missing requirement evidence: {row['internship_id']} / {row['skill_id']}")
    for row in data["Projects"]:
        for skill in (row["target_skill_ids"] or "").split("|"):
            if skill.strip() and skill.strip() not in indexes["Skills"]:
                raise ValueError(f"Projects: unknown skill {skill} in {row['project_id']}")
    for row in data["Milestones"]:
        if row["project_id"] not in indexes["Projects"]:
            raise ValueError(f"Milestones: unknown project {row['project_id']}")
    for sheet, rows in data.items():
        blanks = sum(value is None for row in rows for value in row.values())
        if blanks:
            warnings.append(f"{sheet}: {blanks} blank cells retained as null")
    return warnings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "BridgePath_Data.xlsx")
    parser.add_argument("--output", type=Path, default=ROOT / "src/data/bridgepath-workbook.json")
    args = parser.parse_args()
    if not args.input.is_file():
        raise SystemExit(f"Workbook not found: {args.input}. No replacement data generated.")
    if args.output.resolve() == args.input.resolve():
        raise SystemExit("Output cannot overwrite the source workbook")
    try:
        original_hash = hashlib.sha256(args.input.read_bytes()).hexdigest()
        data = read_workbook(args.input)
        warnings = validate(data)
        if hashlib.sha256(args.input.read_bytes()).hexdigest() != original_hash:
            raise ValueError("Workbook changed during import; rerun the import")
        counts = {name: len(rows) for name, rows in data.items()}
        output = {"metadata": {"source": args.input.name, "source_sha256": original_hash,
                  "imported_at": datetime.now(timezone.utc).isoformat(), "record_counts": counts,
                  "warnings": warnings}, **data}
        args.output.parent.mkdir(parents=True, exist_ok=True)
        # Replace only after validation succeeds, so failures preserve the last good snapshot.
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=args.output.parent, delete=False) as temp:
            json.dump(output, temp, indent=2, ensure_ascii=False)
            temp.write("\n")
            temp_path = Path(temp.name)
        temp_path.replace(args.output)
        print(json.dumps({"records": counts, "warnings": warnings, "source_sha256": original_hash}, indent=2))
        print(f"Validated snapshot: {args.output}")
    except (ValueError, KeyError, zipfile.BadZipFile, ET.ParseError) as error:
        raise SystemExit(f"Import failed (snapshot unchanged): {error}") from error


if __name__ == "__main__":
    main()
