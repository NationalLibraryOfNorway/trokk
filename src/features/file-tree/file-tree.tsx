import React, {useEffect} from 'react';
import { useTrokkFiles } from '../../context/trokk-files-context';
import { FileTree } from '../../model/file-tree';
import FileTreeItem from '../file-tree-item/file-tree-item.tsx';

const FileTreeComponent: React.FC = () => {
  const { state, dispatch } = useTrokkFiles();

  useEffect(() => {
    for (const child of state.fileTrees) {
      if (child.isDirectory) {
        changeViewDirectory(child)
        break
      }
    }
  }, []);

  const changeViewDirectory = (fileTree: FileTree): void => {
    dispatch({ type: 'SET_CURRENT', payload: fileTree });
  };

  const toggleFolderExpand = (fileTree: FileTree): void => {
    const updateFileTree = (files: FileTree[]): FileTree[] => {
      return files.map((file) => {
        if (file.path === fileTree.path) {
          return { ...file, opened: !file.opened } as FileTree;
        }
        if (file.children) {
          return { ...file, children: updateFileTree(file.children) } as FileTree;
        }
        return file as FileTree;
      });
    };

    const updatedFileTrees = updateFileTree(state.fileTrees);
    dispatch({ type: 'SET_FILE_TREES', payload: updatedFileTrees });
  };

  return (
      <div className="h-[calc(96vh)] overflow-y-scroll w-screen">
        <ul>
          {state.fileTrees.length > 0 && state.fileTrees.map((file) => (
              <FileTreeItem
                  key={file.path}
                  file={file}
                  toggleFolderExpand={toggleFolderExpand}
                  changeViewDirectory={changeViewDirectory}
                  currentPath={state.current?.path ? state.current.path : ""}
              />
          ))}
        </ul>
      </div>
  );
};

export default FileTreeComponent;