'use client'

export function Button(props: React.ComponentProps<'button'>): React.ReactNode {
	return <button type="button" data-slot="button" {...props} />
}
