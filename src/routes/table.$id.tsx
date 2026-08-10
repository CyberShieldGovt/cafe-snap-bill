import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/table/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/admin/table/$id", params: { id: params.id } });
  },
});
