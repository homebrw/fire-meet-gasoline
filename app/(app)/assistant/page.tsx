export const dynamic = "force-dynamic"

import { AssistantChat } from "@/components/assistant/AssistantChat"

export default function AssistantPage() {
  return (
    <div className="max-w-2xl mx-auto flex h-full min-h-0 flex-col p-4 md:p-6 pt-4 md:pt-6">
      <h1 className="text-2xl font-bold mb-4">Assistant</h1>
      <AssistantChat />
    </div>
  )
}
