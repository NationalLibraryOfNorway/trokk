import React from 'react';
import {ChevronDown, ChevronRight, FileImage, Folder, FolderOpen, Upload} from 'lucide-react';
import {FileTree} from '../../model/file-tree';
import {formatFileNames} from '../../util/file-utils';
import {calculateProgress} from '../../model/transfer-progress';
import {useUploadProgress} from '../../context/upload-progress-context.tsx';

interface FileTreeItemProps {
    file: FileTree;
    toggleFolderExpand: (fileTree: FileTree) => void;
    changeViewDirectory: (fileTree: FileTree) => void;
    currentPath: string;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
                                                       file,
                                                       toggleFolderExpand,
                                                       changeViewDirectory,
                                                       currentPath
                                                   }) => {
    const {allUploadProgress} = useUploadProgress();

    const getSelectedDirectoryHighlight = (dirName: string): string => {
        return dirName === currentPath ? 'bg-blue-500 text-white' : 'hover:bg-stone-700';
    };

    return (
        <li key={file.path} className="my-0">
            {file.isDirectory ? (
                !file.name.startsWith('.') && (
                    <div className="flex items-center">
                        <span className="mr-2 cursor-pointer mb-0.5" onClick={() => toggleFolderExpand(file)}>
                            {!file.opened ? (
                                <ChevronRight size="16" className="text-stone-500"/>
                            ) : (
                                <ChevronDown size="16" className="text-stone-500"/>
                            )}
                        </span>
                        <span
                            className={`flex items-center w-full rounded-md transition-colors duration-200 cursor-pointer ${getSelectedDirectoryHighlight(file.path)} -ml-2 pl-2`}
                            onClick={(e) => {
                                e.preventDefault();
                                changeViewDirectory(file);
                            }}
                            onKeyDown={(e) => {
                                e.preventDefault();
                                changeViewDirectory(file);
                            }}
                        >
                            {file.opened ? (
                                <FolderOpen size="16" className="mr-2 mb-1 flex-shrink-0"/>
                            ) : (
                                <Folder size="16" className="mr-2 mb-1 flex-shrink-0"/>
                            )}
                            {allUploadProgress.dir[file.path] && (
                                <span className="flex items-center pr-1 text-amber-400">
                                    <Upload className="mb-1" size="16"/>
                                    &nbsp;
                                    {calculateProgress(allUploadProgress.dir[file.path])}
                                </span>
                            )}
                            <span>{formatFileNames(file.name)}</span>

                        </span>
                    </div>
                )
            ) : (
                <div className="flex">
                    <FileImage size="16" className="mr-2 mt-0.5 flex-shrink-0"/>
                    <span>{formatFileNames(file.name)}</span>
                </div>
            )}
            {file.opened && !file.name.startsWith('.') && file.children && file.children.length > 0 && (
                <ul className="pl-10 relative before:content-[''] before:absolute before:-ml-8 before:top-0 before:bottom-0 before:w-px before:bg-stone-600">
                    {file.children.map((child) => (
                        <FileTreeItem
                            key={child.path}
                            file={child}
                            toggleFolderExpand={toggleFolderExpand}
                            changeViewDirectory={changeViewDirectory}
                            currentPath={currentPath}
                        />
                    ))}
                </ul>
            )}
            {file.opened && (!file.children || file.children.length < 1) && (
                <ul className="pl-4 text-stone-500 italic">&emsp;Ingen filer i denne mappen</ul>
            )}
        </li>
    );
};

export default FileTreeItem;