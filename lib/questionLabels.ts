export function questionTypeLabel(type: string): string {
  switch (type) {
    case "MULTIPLE_CHOICE":
      return "Pilihan ganda";
    case "TRUE_FALSE":
      return "Benar / salah";
    case "SHORT_ANSWER":
      return "Isian singkat";
    case "ESSAY":
      return "Esai";
    case "MIXED":
      return "Pilihan ganda & esai";
    default:
      return type;
  }
}
