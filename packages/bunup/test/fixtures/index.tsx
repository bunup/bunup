import './styles.css'

export function Button(): React.ReactNode {
	return (
		<button
			type="button"
			className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
		>
			Click me
		</button>
	)
}
