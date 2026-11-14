import copy
import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("import_data", ROOT / "scripts/import_data.py")
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.data = importer.read_workbook(ROOT / "BridgePath_Data.xlsx")

    def test_all_rows_and_original_workbook_unchanged(self):
        path = ROOT / "BridgePath_Data.xlsx"
        before = hashlib.sha256(path.read_bytes()).hexdigest()
        self.assertEqual(importer.validate(self.data), [])
        self.assertEqual(set(self.data), set(importer.SCHEMA))
        # Compare to nonblank XML data rows, not a second copy of the JSON counts.
        ns = importer.NS
        with zipfile.ZipFile(path) as archive:
            for i, name in enumerate(importer.SCHEMA, 1):
                xml = importer.ET.fromstring(archive.read(f"xl/worksheets/sheet{i}.xml"))
                rows = xml.findall('m:sheetData/m:row', ns)
                self.assertEqual(len(self.data[name]), len(rows) - 1)
        self.assertEqual(before, hashlib.sha256(path.read_bytes()).hexdigest())

    def test_snapshot_preserves_every_value_and_id(self):
        snapshot = json.loads((ROOT / 'src/data/bridgepath-workbook.json').read_text())
        for sheet, rows in self.data.items():
            self.assertEqual(snapshot[sheet], rows)
            self.assertEqual(snapshot['metadata']['record_counts'][sheet], len(rows))
        digest = hashlib.sha256((ROOT / 'BridgePath_Data.xlsx').read_bytes()).hexdigest()
        self.assertEqual(snapshot['metadata']['source_sha256'], digest)

    def test_failed_import_preserves_previous_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'snapshot.json'
            output.write_text('previous snapshot')
            result = subprocess.run(['python3', '-B', str(ROOT / 'scripts/import_data.py'),
                '--input', str(Path(directory) / 'missing.xlsx'), '--output', str(output)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(output.read_text(), 'previous snapshot')

    def test_duplicate_ids_fail(self):
        for sheet in ['Internships', 'Skills', 'Projects', 'Milestones']:
            data = copy.deepcopy(self.data)
            data[sheet].append(copy.deepcopy(data[sheet][0]))
            with self.assertRaisesRegex(ValueError, 'duplicate'):
                importer.validate(data)

    def test_broken_cross_sheet_links_fail(self):
        for sheet, field in [('Requirements', 'internship_id'), ('Requirements', 'skill_id'), ('Milestones', 'project_id')]:
            data = copy.deepcopy(self.data)
            data[sheet][0][field] = 'missing'
            with self.assertRaises(ValueError): importer.validate(data)
        self.data['Projects'][0]['target_skill_ids'] = 'missing'
        with self.assertRaisesRegex(ValueError, 'unknown skill'): importer.validate(self.data)

    def test_duplicate_requirement_rows_are_preserved(self):
        before = len(self.data['Requirements'])
        self.data['Requirements'].append(copy.deepcopy(self.data['Requirements'][0]))
        importer.validate(self.data)
        self.assertEqual(len(self.data['Requirements']), before + 1)

    def test_optional_blanks_warn_without_fabrication(self):
        self.data['Internships'][0]['company'] = None
        self.data['Requirements'][0]['evidence_excerpt'] = None
        self.data['Requirements'][0]['requirement_type'] = None
        warnings = importer.validate(self.data)
        self.assertTrue(any('Missing requirement evidence' in warning for warning in warnings))
        self.assertIsNone(self.data['Internships'][0]['company'])

    def test_unknown_requirement_type_fails(self):
        self.data['Requirements'][0]['requirement_type'] = 'invented'
        with self.assertRaisesRegex(ValueError, 'requirement_type'): importer.validate(self.data)

    def changed_workbook(self, filename, before, after):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        output = Path(directory.name) / 'test.xlsx'
        with zipfile.ZipFile(ROOT / 'BridgePath_Data.xlsx') as source, zipfile.ZipFile(output, 'w') as target:
            for info in source.infolist():
                content = source.read(info.filename)
                if info.filename == filename:
                    content = content.replace(before.encode(), after.encode())
                target.writestr(info, content)
        return output

    def test_missing_column_fails(self):
        path = self.changed_workbook('xl/worksheets/sheet1.xml', '>company<', '>missing_column<')
        with self.assertRaisesRegex(ValueError, 'missing columns'): importer.read_workbook(path)

    def test_formula_cells_fail_instead_of_importing_stale_results(self):
        path = self.changed_workbook('xl/worksheets/sheet1.xml', '<is><t>INT-001</t></is>', '<f>1+1</f><v>2</v>')
        with self.assertRaisesRegex(ValueError, 'formula cells'): importer.read_workbook(path)


if __name__ == '__main__': unittest.main()
