pub fn get_file_size(path: &str) -> Result<u64, String> {
    let mut size = 0;
    for dir_entry_result in std::fs::read_dir(path).unwrap() {
        let dir_entry = dir_entry_result.unwrap();
        let path = dir_entry.path();
        if path.is_file() {
            size += match std::fs::metadata(path) {
                Ok(data) => data.len(),
                Err(e) => return Err(e.to_string()),
            };
        }
    }
    Ok(size)
}