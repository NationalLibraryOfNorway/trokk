import React, {useState} from 'react';
import FileTree from '../../features/file-tree/file-tree.tsx';
import Split from 'react-split';
import './main-layout.css';
import RegistrationForm from '../../features/registration/registration-form.tsx';
import FilesContainer from '../../features/files-container/files-container.tsx';
import TransferLog from '../../features/transfer-log/transfer-log.tsx';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {
    toggleLeftPanel,
    toggleRightPanel,
    HIDDEN_SIZE,
    LEFT_PANEL_DEFAULT,
    RIGHT_PANEL_DEFAULT
} from '../../util/panelToggle.ts';

const MainLayout: React.FC = () => {
    const iconSize = 15;
    const [sizes, setSizes] = useState([LEFT_PANEL_DEFAULT, 100 - LEFT_PANEL_DEFAULT - RIGHT_PANEL_DEFAULT, RIGHT_PANEL_DEFAULT]);

    const toggleLeft = () => setSizes(toggleLeftPanel);
    const toggleRight = () => setSizes(toggleRightPanel);

    return (
        <div className="relative h-[calc(94vh)]">
            <Split
                sizes={sizes}
                onDragEnd={setSizes}
                className="split h-full"
            >
                {/* FileTree panel */}
                <div className={`h-full flex ${sizes[0] === HIDDEN_SIZE ? 'justify-start' : 'justify-end pr-1'}`}>
                    {sizes[0] !== HIDDEN_SIZE && (
                        <div className="flex flex-col pr-4 w-full h-full">
                            <FileTree/>
                        </div>
                    )}
                    <button
                        onClick={toggleLeft}
                        className="self-start px-0 h-full border-x-stone-600 border-r-1 rounded-none bg-stone-800/50 shadow-none"
                        aria-label="Toggle File Tree"
                    >
                        {sizes[0] === HIDDEN_SIZE ? <ChevronRight size={iconSize}/> : <ChevronLeft size={iconSize}/>}
                    </button>
                </div>

                {/* Files container */}
                <div className="h-full w-full">
                    <FilesContainer/>
                </div>

                {/* TransferLog panel */}
                <div className={`h-full flex ${sizes[2] === HIDDEN_SIZE ? 'justify-end' : 'justify-start pr-[20x]'}`}>
                    <button
                        onClick={toggleRight}
                        className="self-start px-0 border-x-stone-600 border-l-1 h-full rounded-none bg-stone-800/50 shadow-none"
                        aria-label="Toggle Transfer Log"
                    >
                        {sizes[2] === HIDDEN_SIZE ? <ChevronLeft size={iconSize}/> : <ChevronRight size={iconSize}/>}
                    </button>
                    <div className="flex flex-col h-full">
                        {sizes[2] !== HIDDEN_SIZE && (
                            <>
                                <RegistrationForm/>
                                <TransferLog/>
                            </>
                        )}
                    </div>
                </div>
            </Split>
        </div>
    )
        ;
};

export default MainLayout;
