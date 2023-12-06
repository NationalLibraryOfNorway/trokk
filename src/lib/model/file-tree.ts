interface FileTree {
    path: string,
    name: string,
    index: number,
    opened: boolean
    children?: FileTree[]
}