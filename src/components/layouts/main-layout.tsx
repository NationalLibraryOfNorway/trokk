import React, { useState } from 'react';
import FileTree from '../../features/file-tree/file-tree.tsx';
import Split from 'react-split';
import './main-layout.css';
import RegistrationForm from '../../features/registration/registration-form.tsx';
import FilesContainer from '../../features/files-container/files-container.tsx';
import { TransferLogProvider } from '../../context/transfer-log-context.tsx';
import TransferLog from '../../features/transfer-log/transfer-log.tsx';
import DetailedImageView from '../../features/detailed-image-view/detailed-image-view.tsx';
import { useTrokkFiles } from '../../context/trokk-files-context.tsx';
import { useSelection } from '../../context/selection-context.tsx';
import { useKeyboardNavigation } from '../../hooks/use-keyboard-navigation.tsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MainLayout: React.FC = () => {
    const { state } = useTrokkFiles();
    const { handleClose } = useSelection();
    const files = state.current?.children?.filter(child => !child.isDirectory) || [];

    const [sizes, setSizes] = useState([18, 62, 20]);

    useKeyboardNavigation();

    const toggleLeft = () => {
        setSizes(prev => (prev[0] === 1 ? [18, prev[1] - 18, prev[2]] : [1, prev[1] + prev[0], prev[2]]));
    };

    const toggleRight = () => {
        setSizes(prev => (prev[2] === 1 ? [prev[0], prev[1] - 20, 20] : [prev[0], prev[1] + prev[2], 1]));
    };

    return (
        <>
            {state.preview && (
                <div
                    className="fixed inset-0 w-screen z-50 preview bg-stone-800/90 flex justify-center items-center"
                    onClick={handleClose}
                >
                    <DetailedImageView files={files} />
                </div>
            )}

            {/* Toggle buttons overlayed */}
            <div className="relative h-[calc(94vh)]">
                <Split
                    sizes={sizes}
                    onDragEnd={setSizes}
                    minSize={[1, 400, 1]}
                    maxSize={[350, 2000, 350]}
                    snapOffset={10}
                    className="split h-full"
                    gutterSize={0}
                >
                    {/* FileTree panel */}
                    <div className={`h-full flex ${sizes[0] === 1 ? 'justify-start' : 'justify-end pr-1'}`}>
                        {sizes[0] !== 1 && (
                            <div className="flex flex-col pr-4 w-full h-full">
                                <FileTree />
                            </div>
                        )}
                        <button
                            onClick={toggleLeft}
                            className="self-start px-0 h-full border-x-stone-600 border-r-1 rounded-none bg-stone-800/50 shadow-none"
                            aria-label="Toggle File Tree"
                        >
                            {sizes[0] === 1 ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                        </button>
                    </div>

                    {/* Files container */}
                    <div className="h-full w-full">
                        <FilesContainer />
                    </div>

                    {/* TransferLog panel */}
                    <div className={`h-full flex ${sizes[2] === 1 ? 'justify-end' : 'justify-start'}`}>
                        <button
                            onClick={toggleRight}
                            className="self-start px-0 border-x-stone-600 border-x-1 h-full rounded-none bg-stone-800/50 shadow-none"
                            aria-label="Toggle Transfer Log"
                        >
                            {sizes[2] === 1 ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
                        </button>
                        <div className="flex flex-col w-full h-full">
                            {sizes[2] !== 1 && (
                                <TransferLogProvider>
                                    <RegistrationForm />
                                    <TransferLog />
                                </TransferLogProvider>
                            )}
                        </div>
                    </div>
                </Split>
            </div>
        </>
    );
};

export default MainLayout;
