export function createFixture(name: string): {
    name: string;
    path: string;
    content: string;
} {
    return {
        name,
        path: `./${name}`,
        content: `export const ${name} = "foo";`,
    };
}
