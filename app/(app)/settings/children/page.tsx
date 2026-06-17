import { ChildrenList } from "./children-list"
import { CreateChildButton } from "./create-child-button"

export default function ChildrenPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Enfants</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gérez les informations de vos enfants
          </p>
        </div>
        <CreateChildButton />
      </div>

      <ChildrenList />
    </div>
  )
}
