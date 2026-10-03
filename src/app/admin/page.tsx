import { redirect } from "next/navigation";

/**
 * There is no admin home of its own. Anyone typing /admin lands on the queue
 * that most often needs attention, rather than a "page not found".
 */
export default function AdminIndex() {
  redirect("/admin/approvals");
}
