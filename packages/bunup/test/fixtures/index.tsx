import styles from './button.module.css'

type Variant = 'button' | 'button-active'

export default function Button({
	variant,
}: {
	variant: Variant
}): React.ReactNode {
	return <button type="button" className={styles[variant]} />
}
