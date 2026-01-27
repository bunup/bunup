export function Button(props: React.ComponentProps<"button">): React.ReactNode {
	return (
		<button
			type="button"
			className="yuku:bg-blue-500 yuku:hover:bg-blue-600 yuku:text-white yuku:px-4 yuku:py-2 yuku:rounded-md"
			{...props}
		/>
	);
}
