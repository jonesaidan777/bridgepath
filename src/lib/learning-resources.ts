// Free places to learn each workbook skill. Every skill gets a YouTube search
// (always available); well-known free courses are added where one fits.
export interface LearningLink { label: string; url: string }

const course: Record<string, LearningLink> = {
  python: { label: "CS50’s Intro to Python (Harvard, free)", url: "https://cs50.harvard.edu/python/" },
  sql: { label: "Kaggle: Intro to SQL", url: "https://www.kaggle.com/learn/intro-to-sql" },
  databases: { label: "Khan Academy: Intro to SQL", url: "https://www.khanacademy.org/computing/computer-programming/sql" },
  git: { label: "Learn Git Branching (interactive)", url: "https://learngitbranching.js.org/" },
  javascript_typescript: { label: "The Odin Project (free)", url: "https://www.theodinproject.com/" },
  react: { label: "React.dev: Learn React", url: "https://react.dev/learn" },
  nodejs: { label: "The Odin Project: Node.js", url: "https://www.theodinproject.com/paths/full-stack-javascript/courses/nodejs" },
  rest_apis: { label: "freeCodeCamp: Back End & APIs", url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/" },
  docker: { label: "Docker: Get started", url: "https://docs.docker.com/get-started/" },
  aws: { label: "AWS Skill Builder: Cloud Practitioner Essentials", url: "https://skillbuilder.aws/" },
  cloud_platforms: { label: "AWS Skill Builder (free courses)", url: "https://skillbuilder.aws/" },
  cloud_infrastructure: { label: "AWS Skill Builder (free courses)", url: "https://skillbuilder.aws/" },
  ci_cd: { label: "GitHub Actions: Quickstart", url: "https://docs.github.com/en/actions/writing-workflows/quickstart" },
  data_structures_algorithms: { label: "NeetCode Roadmap (free)", url: "https://neetcode.io/roadmap" },
  java: { label: "University of Helsinki: Java MOOC", url: "https://java-programming.mooc.fi/" },
  machine_learning: { label: "Kaggle: Intro to Machine Learning", url: "https://www.kaggle.com/learn/intro-to-machine-learning" },
  pandas: { label: "Kaggle: Pandas", url: "https://www.kaggle.com/learn/pandas" },
  data_analysis: { label: "Kaggle: Pandas", url: "https://www.kaggle.com/learn/pandas" },
  data_visualization: { label: "Kaggle: Data Visualization", url: "https://www.kaggle.com/learn/data-visualization" },
  statistics: { label: "Khan Academy: Statistics & Probability", url: "https://www.khanacademy.org/math/statistics-probability" },
  linear_algebra: { label: "Khan Academy: Linear Algebra", url: "https://www.khanacademy.org/math/linear-algebra" },
  excel: { label: "Microsoft: Excel training", url: "https://support.microsoft.com/en-us/excel" },
  c_cpp: { label: "learncpp.com (free)", url: "https://www.learncpp.com/" },
  embedded_systems: { label: "Arduino: Learn", url: "https://docs.arduino.cc/learn/" },
  linux: { label: "The Odin Project: Command line basics", url: "https://www.theodinproject.com/lessons/foundations-command-line-basics" },
  user_stories: { label: "Atlassian: User stories", url: "https://www.atlassian.com/agile/project-management/user-stories" },
  product_roadmap: { label: "Atlassian: Product roadmaps", url: "https://www.atlassian.com/agile/product-management/product-roadmaps" },
  product_requirements: { label: "Atlassian: Product requirements", url: "https://www.atlassian.com/agile/product-management/requirements" },
};

export function learningLinks(skillId: string, skillName: string): { video: LearningLink; course?: LearningLink } {
  return {
    video: {
      label: "Watch a beginner video",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skillName} for beginners`)}`,
    },
    course: course[skillId],
  };
}
