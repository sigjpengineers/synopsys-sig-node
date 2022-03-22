export function relatavize_path(prefix: string, path: string): string {
    let length = prefix.length
    if (!length) {
        length = 'undefined'.length
    }

    return path.substring(length + 1)
}