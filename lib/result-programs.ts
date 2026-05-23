import { RESULT_CATEGORY_GROUPS, ResultCategoryGroup, ResultProgram } from "@/lib/results-types";

const RAW_PROGRAMS = [
  ["Arabana (10 Participants)", "General"],
  ["Collage (3 Participants)", "General"],
  ["Duff (10 Participants)", "General"],
  ["Family Magazine", "General"],
  ["Malappattu (3 Participants)", "General"],
  ["Mappila Song Writing", "General"],
  ["Moulid Recitation (4 Participants)", "General"],
  ["Nasheed (4 Participants)", "General"],
  ["Project ( 5 Participants)", "General"],
  ["Qaseeda Burda (4 Participants)", "General"],
  ["Qawwali (5 Participants)", "General"],
  ["Revolutionary song (3 Participants)", "General"],
  ["Revolutionary Song Writing", "General"],
  ["Risala Quiz (2 Participants)", "General"],
  ["Spot Magazine (5 Participants)", "General"],
  ["Wall Painting (2 Participants)", "General"],
  ["Group Song A (4 Participants)", "General Category-A"],
  ["Group Song B (4 Participants)", "General Category-B"],
  ["Arabic Poem Recitation", "High School"],
  ["Book Test", "High School"],
  ["Book Test (Girls Only)", "High School"],
  ["Caption Writing", "High School"],
  ["Embroidery (Girls Only)", "High School"],
  ["English Elocution", "High School"],
  ["Language Game English", "High School"],
  ["Madh Song", "High School"],
  ["Malayalam Elocution", "High School"],
  ["Malayalam Essay Writing", "High School"],
  ["Malayalam Poetry Recitation", "High School"],
  ["Mappila Song", "High School"],
  ["News Reading", "High School"],
  ["Pencil Drawing", "High School"],
  ["Pencil Drawing (Girls Only)", "High School"],
  ["Poetry Writing", "High School"],
  ["Poetry Writing (Girls Only)", "High School"],
  ["Quiz", "High School"],
  ["Story Writing", "High School"],
  ["Story Writing (Girls Only)", "High School"],
  ["Urdu Poetry Recitation", "High School"],
  ["Watercolor Painting", "High School"],
  ["Watercolor Painting (Girls Only)", "High School"],
  ["Arabic Calligraphy", "Higher Secondary"],
  ["Arabic Calligraphy (Girls Only)", "Higher Secondary"],
  ["Book Test", "Higher Secondary"],
  ["Book Test (Girls Only)", "Higher Secondary"],
  ["Devotional Song", "Higher Secondary"],
  ["Digital Painting", "Higher Secondary"],
  ["Elocution", "Higher Secondary"],
  ["English Essay", "Higher Secondary"],
  ["Malayalam Essay", "Higher Secondary"],
  ["Mappila Pattu", "Higher Secondary"],
  ["News Writing", "Higher Secondary"],
  ["Pencil Drawing", "Higher Secondary"],
  ["Poetry Writing", "Higher Secondary"],
  ["Poetry Writing (Girls Only)", "Higher Secondary"],
  ["Quiz", "Higher Secondary"],
  ["Reel Making", "Higher Secondary"],
  ["Story Writing", "Higher Secondary"],
  ["Story Writing (Girls Only)", "Higher Secondary"],
  ["Urdu Poetry Recitation", "Higher Secondary"],
  ["Watercolor Painting", "Higher Secondary"],
  ["AI Poetry Writing", "Junior"],
  ["Arabic Calligraphy", "Junior"],
  ["Arabic Elocution", "Junior"],
  ["Arabic Essay", "Junior"],
  ["Arabic Translation", "Junior"],
  ["Book Test", "Junior"],
  ["Elocution", "Junior"],
  ["Elocution English", "Junior"],
  ["Hadith Musabaqa", "Junior"],
  ["Literary Debate", "Junior"],
  ["Madh Song Writing", "Junior"],
  ["Malayalam Essay", "Junior"],
  ["Mappila Song", "Junior"],
  ["Podcast", "Junior"],
  ["Poetry Writing", "Junior"],
  ["Quiz", "Junior"],
  ["Slogan Writing", "Junior"],
  ["Social Text", "Junior"],
  ["Socio Synapse", "Junior"],
  ["Story Writing", "Junior"],
  ["Book Test", "Lower Primary"],
  ["Elocution", "Lower Primary"],
  ["Journal Art (Girls Only)", "Lower Primary"],
  ["Language Game", "Lower Primary"],
  ["Madh Song", "Lower Primary"],
  ["Malayalam Handwriting  (Girls Only)", "Lower Primary"],
  ["Malayalam Reading", "Lower Primary"],
  ["Pencil Drawing", "Lower Primary"],
  ["Pencil Drawing (Girls Only)", "Lower Primary"],
  ["Quiz", "Lower Primary"],
  ["Reading Arabic-Malayalam", "Lower Primary"],
  ["Storytelling", "Lower Primary"],
  ["Watercolor Painting (Girls Only)", "Lower Primary"],
  ["Watercolour Painting", "Lower Primary"],
  ["Book Test", "Senior"],
  ["Digital Illustration", "Senior"],
  ["Digital Painting", "Senior"],
  ["Elocution", "Senior"],
  ["English Essay", "Senior"],
  ["English Poem Recitation", "Senior"],
  ["English Poetry Writing", "Senior"],
  ["ePoster", "Senior"],
  ["Feature Writing", "Senior"],
  ["Madh Song Writing", "Senior"],
  ["Malayalam Elocution", "Senior"],
  ["Malayalam Essay Writing", "Senior"],
  ["Mappila Song", "Senior"],
  ["Mushaa'ra Alfiyya", "Senior"],
  ["Poetry Writing", "Senior"],
  ["Political Debate", "Senior"],
  ["Poster Designing", "Senior"],
  ["Quiz", "Senior"],
  ["Slogan Writing", "Senior"],
  ["Social Text", "Senior"],
  ["Story Writing", "Senior"],
  ["Translation English", "Senior"],
  ["Urdu Essay Writing", "Senior"],
  ["Urdu Hamd", "Senior"],
  ["Book Test", "Upper Primary"],
  ["Book Test (Girls Only)", "Upper Primary"],
  ["Elocution", "Upper Primary"],
  ["Mappila Pattu", "Upper Primary"],
  ["Math Games", "Upper Primary"],
  ["Origami (Girls Only)", "Upper Primary"],
  ["Pencil Drawing", "Upper Primary"],
  ["Pencil Drawing (Girls Only)", "Upper Primary"],
  ["Quiz", "Upper Primary"],
  ["Spelling Bee", "Upper Primary"],
  ["Story Writing", "Upper Primary"],
  ["Story Writing (Girls Only)", "Upper Primary"],
  ["Storytelling", "Upper Primary"],
  ["Sudoku", "Upper Primary"],
  ["Watercolor Painting (Girls Only)", "Upper Primary"],
  ["Watercolor Painting Watercolors", "Upper Primary"],
] as const;

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCategoryGroup(category: string): ResultCategoryGroup {
  if (category === "General Category-A" || category === "General Category-B") {
    return "General";
  }

  if ((RESULT_CATEGORY_GROUPS as readonly string[]).includes(category)) {
    return category as ResultCategoryGroup;
  }

  return "General";
}

export function getPublicCompetitionName(competitionName: string): string {
  const suffixes: string[] = [];
  const baseName = competitionName
    .replace(/\s*\(([^)]*)\)\s*/g, (_match, note: string) => {
      const normalizedNote = note.replace(/\s+/g, " ").trim().toLowerCase();
      if (normalizedNote === "girls only") {
        suffixes.push("Girls");
      }
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();

  const uniqueSuffixes = suffixes.filter((suffix, index) => suffixes.indexOf(suffix) === index);
  return [baseName, ...uniqueSuffixes].filter(Boolean).join(" ");
}

export const RESULT_PROGRAMS: ResultProgram[] = RAW_PROGRAMS.map(([competitionName, category], index) => ({
  id: `${slugify(category)}-${slugify(competitionName)}-${index + 1}`,
  competitionName,
  publicCompetitionName: getPublicCompetitionName(competitionName),
  category,
  categoryGroup: getCategoryGroup(category),
  sortOrder: index + 1,
}));

export function getResultProgram(programId: string): ResultProgram | undefined {
  return RESULT_PROGRAMS.find((program) => program.id === programId);
}
