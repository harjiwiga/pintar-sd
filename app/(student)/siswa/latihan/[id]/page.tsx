import { AssignmentQuiz } from "@/components/quiz/AssignmentQuiz";

export default async function SiswaLatihanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentQuiz assignmentId={id} />;
}
