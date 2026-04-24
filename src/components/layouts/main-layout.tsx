import React from 'react';
import FileTree from '@/features/file-tree/file-tree.tsx';
import RegistrationForm from '@/features/registration/registration-form.tsx';
import FilesContainer from '@/features/files-container/files-container.tsx';
import TransferLog from '@/features/transfer-log/transfer-log.tsx';
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from '@/components/ui/resizable.tsx';
import {ScrollArea} from '@/components/ui/scroll-area.tsx';
import {useSettings} from '@/context/setting-context.tsx';
import {
    areWorkspacePaneSizesEqual,
    minimumWorkspacePaneSizes,
    normalizeWorkspacePaneSizes,
    type WorkspacePaneSizes,
} from '@/util/workspace-pane-layout.ts';

const paneKeys = ['navigation', 'workspace', 'task'] as const;

const MainLayout: React.FC = () => {
    const {
        workspacePaneSizes,
        setWorkspacePaneSizes,
    } = useSettings();
    const [panelGroupKey, setPanelGroupKey] = React.useState(0);
    const lastPersistedPaneSizes = React.useRef<WorkspacePaneSizes>(workspacePaneSizes);

    React.useEffect(() => {
        const normalizedSizes = normalizeWorkspacePaneSizes(workspacePaneSizes);
        if (!areWorkspacePaneSizesEqual(normalizedSizes, lastPersistedPaneSizes.current)) {
            lastPersistedPaneSizes.current = normalizedSizes;
            setPanelGroupKey((currentKey) => currentKey + 1);
        }
    }, [workspacePaneSizes]);

    const handleLayout = React.useCallback((layout: Record<string, number>) => {
        const sizes = paneKeys.map((key) => layout[key] ?? 0);
        const normalizedSizes = normalizeWorkspacePaneSizes(sizes);
        if (areWorkspacePaneSizesEqual(normalizedSizes, lastPersistedPaneSizes.current)) {
            return;
        }

        lastPersistedPaneSizes.current = normalizedSizes;
        setWorkspacePaneSizes(normalizedSizes);
    }, [setWorkspacePaneSizes]);

    return (
        <ResizablePanelGroup
            key={panelGroupKey}
            orientation="horizontal"
            className="flex flex-1 min-h-0 w-full"
            onLayoutChanged={handleLayout}
        >
            <ResizablePanel
                id={paneKeys[0]}
                defaultSize={lastPersistedPaneSizes.current[0]}
                minSize={minimumWorkspacePaneSizes[0]}
                className="bg-stone-800"
            >
                <section aria-label="Filnavigasjon" className="h-full min-h-0">
                    <ScrollArea className="h-full w-full">
                        <FileTree />
                    </ScrollArea>
                </section>
            </ResizablePanel>

            <ResizableHandle withHandle aria-label="Endre bredde mellom navigasjon og arbeidsflate" />

            <ResizablePanel
                id={paneKeys[1]}
                defaultSize={lastPersistedPaneSizes.current[1]}
                minSize={minimumWorkspacePaneSizes[1]}
                className="bg-stone-950"
            >
                <section aria-label="Arbeidsflate" className="h-full min-h-0">
                    <ScrollArea className="h-full w-full">
                        <FilesContainer />
                    </ScrollArea>
                </section>
            </ResizablePanel>

            <ResizableHandle withHandle aria-label="Endre bredde mellom arbeidsflate og arbeidsverktøy" />

            <ResizablePanel
                id={paneKeys[2]}
                defaultSize={lastPersistedPaneSizes.current[2]}
                minSize={minimumWorkspacePaneSizes[2]}
                className="bg-stone-800"
            >
                <section aria-label="Arbeidsverktøy" className="flex h-full min-h-0 flex-col overflow-hidden">
                    <div className="shrink-0 border-b border-stone-700/80">
                        <RegistrationForm />
                    </div>
                    <div className="min-h-0 flex-1">
                        <ScrollArea className="h-full w-full">
                            <TransferLog />
                        </ScrollArea>
                    </div>
                </section>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};

export default MainLayout;
