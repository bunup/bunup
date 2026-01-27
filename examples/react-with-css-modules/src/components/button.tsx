import styles from "./button.module.css";

type ButtonProps = React.ComponentProps<"button"> & {
	variant?: "primary" | "secondary" | "danger";
};

export function Button({ variant = "primary", ...props }: ButtonProps): React.ReactNode {
	return <button type="button" className={`${styles.button} ${styles[variant]}`} {...props} />;
}
