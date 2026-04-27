import React from 'react';
import {ChevronDown, ChevronRight, Folder, FolderOpen, Upload} from 'lucide-react';
import {FileTree} from '@/model/file-tree';
import {formatFileNames, getFolderImageSummary, getWorkingDirectory} from '@/util/file-utils';
import {calculateProgress} from '@/model/transfer-progress';
import {useUploadProgress} from '@/context/upload-progress-context.tsx';
import {useMessage} from '@/context/message-context.tsx';

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
    const {removeMessages} = useMessage();
    const visibleChildFolders = file.children?.filter(
        (child) => child.isDirectory && !child.name.startsWith('.')
    ) ?? [];
    const summary = getFolderImageSummary(file);
    const selected = file.path === currentPath || getWorkingDirectory(file)?.path === currentPath;

    const getSelectedDirectoryHighlight = (): string => {
        return selected ? 'bg-blue-500 text-white' : 'hover:bg-stone-700';
    };

    //Avoids having two progress percentages when merge folder is open
    const hasChildProgress = file.children?.some(
        (child) => allUploadProgress.dir[child.path]
    );

    if (!file.isDirectory || file.name.startsWith('.')) {
        return null;
    }

    const pillClassName = summary.status === 'odd'
        ? 'bg-red-950 text-red-200 ring-red-900/80'
        : 'bg-emerald-950 text-emerald-200 ring-emerald-900/80';

    return (
        <li key={file.path}>
            <div className="flex items-center min-w-0">
                <span className="mr-2 cursor-pointer my-1 shrink-0" onClick={() => toggleFolderExpand(file)}>
                    {!file.opened ? (
                        <ChevronRight size="16" className="text-stone-500"/>
                    ) : (
                        <ChevronDown size="16" className="text-stone-500"/>
                    )}
                </span>
                <span
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-md transition-colors duration-200 cursor-pointer ${getSelectedDirectoryHighlight()} -ml-2 pl-2 pr-2`}
                    onClick={(e) => {
                        e.preventDefault();
                        changeViewDirectory(getWorkingDirectory(file) ?? file);
                        removeMessages();
                    }}
                    onDoubleClick={(e) => {
                        e.preventDefault();
                        toggleFolderExpand(file);
                    }}
                    onKeyDown={(e) => {
                        e.preventDefault();
                        changeViewDirectory(getWorkingDirectory(file) ?? file);
                        removeMessages();
                    }}
                >
                    {file.opened ? (
                        <FolderOpen size="16" className="mb-1 shrink-0"/>
                    ) : (
                        <Folder size="16" className="mb-1 shrink-0"/>
                    )}
                    {allUploadProgress.dir[file.path] && !hasChildProgress && (
                        <span className="flex items-center pr-1 text-amber-400 shrink-0">
                            <Upload className="mb-1" size="16"/>
                            &nbsp;
                            {calculateProgress(allUploadProgress.dir[file.path])}
                        </span>
                    )}
                    <span className="min-w-0 m-1 flex-1 truncate whitespace-nowrap">
                        {formatFileNames(file.name)}
                    </span>
                    {summary.showsPill && (
                        <span
                            aria-label={`Antall bilder i ${formatFileNames(file.name)}: ${summary.imageCount}`}
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${pillClassName}`}
                        >
                            {summary.imageCount}
                        </span>
                    )}
                </span>
            </div>
            {file.opened && visibleChildFolders.length > 0 && (
                <ul className="pl-10 min-w-0 relative before:content-[''] before:absolute before:-ml-8 before:top-0 before:bottom-0 before:w-px before:bg-stone-600">
                    {visibleChildFolders.map((child) => (
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
        </li>
    );
};

export default FileTreeItem;
