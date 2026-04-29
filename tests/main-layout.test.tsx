import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import MainLayout from '../src/components/layouts/main-layout';
import {minimumWorkspacePaneSizes} from '../src/util/workspace-pane-layout';

const mockSetWorkspacePaneSizes = vi.fn();
const mockUseSettings = vi.fn();

vi.mock('../src/context/setting-context.tsx', () => ({
    useSettings: () => mockUseSettings(),
}));

vi.mock('../src/features/file-tree/file-tree.tsx', () => ({
    default: () => <div>Mock File Tree</div>,
}));

vi.mock('../src/features/files-container/files-container.tsx', () => ({
    default: () => <div>Mock Files Container</div>,
}));

vi.mock('../src/features/registration/registration-form.tsx', () => ({
    default: () => <div>Mock Registration Form</div>,
}));

vi.mock('../src/features/transfer-log/transfer-log.tsx', () => ({
    default: () => <div>Mock Transfer Log</div>,
}));

vi.mock('../src/components/ui/scroll-area.tsx', () => ({
    ScrollArea: ({children, className}: {children: React.ReactNode; className?: string}) => (
        <div data-testid="scroll-area" className={className}>{children}</div>
    ),
}));

vi.mock('../src/components/ui/resizable.tsx', () => ({
    ResizablePanelGroup: ({
        children,
        onLayoutChanged,
        className,
    }: {
        children: React.ReactNode;
        onLayoutChanged?: (layout: Record<string, number>) => void;
        className?: string;
    }) => (
        <div data-testid="panel-group" className={className}>
            <button
                type="button"
                onClick={() => onLayoutChanged?.({navigation: 25, workspace: 45, task: 30})}
            >
                Simulate layout change
            </button>
            {children}
        </div>
    ),
    ResizablePanel: ({
        children,
        defaultSize,
        minSize,
        className,
    }: {
        children: React.ReactNode;
        defaultSize?: number;
        minSize?: number;
        className?: string;
    }) => (
        <div
            data-testid="panel"
            data-default-size={defaultSize}
            data-min-size={minSize}
            className={className}
        >
            {children}
        </div>
    ),
    ResizableHandle: ({
        className,
        withHandle,
        ...props
    }: React.HTMLAttributes<HTMLDivElement> & {withHandle?: boolean}) => (
        <div role="separator" className={className} data-with-handle={withHandle} {...props} />
    ),
}));

const renderMainLayout = () => {
    return render(<MainLayout />);
};

describe('MainLayout workspace shell', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSettings.mockReturnValue({
            workspacePaneSizes: [22, 48, 30],
            setWorkspacePaneSizes: mockSetWorkspacePaneSizes,
        });
    });

    it('renders three visible panes with grouped right-pane content', () => {
        renderMainLayout();

        expect(screen.getByLabelText('Filnavigasjon')).toBeDefined();
        expect(screen.getByLabelText('Arbeidsflate')).toBeDefined();
        expect(screen.getByLabelText('Arbeidsverktøy')).toBeDefined();
        expect(screen.getAllByRole('separator')).toHaveLength(2);
        expect(screen.getByText('Mock File Tree')).toBeDefined();
        expect(screen.getByText('Mock Files Container')).toBeDefined();
        expect(screen.getByText('Mock Registration Form')).toBeDefined();
        expect(screen.getByText('Mock Transfer Log')).toBeDefined();
    });

    it('keeps registration above the transfer log inside the task pane', () => {
        renderMainLayout();

        const taskPane = screen.getByLabelText('Arbeidsverktøy');
        const taskPaneText = within(taskPane).getAllByText(/Mock (Registration Form|Transfer Log)/i);

        expect(taskPaneText[0].textContent).toBe('Mock Registration Form');
        expect(taskPaneText[1].textContent).toBe('Mock Transfer Log');
    });

    it('persists pane sizes when the panel group layout changes', () => {
        renderMainLayout();

        fireEvent.click(screen.getByRole('button', {name: /Simulate layout change/i}));

        expect(mockSetWorkspacePaneSizes).toHaveBeenCalledWith([25, 45, 30]);
    });

    it('clamps restored pane sizes to current minimums before rendering', () => {
        mockUseSettings.mockReturnValue({
            workspacePaneSizes: [5, 90, 5],
            setWorkspacePaneSizes: mockSetWorkspacePaneSizes,
        });

        renderMainLayout();

        const panels = screen.getAllByTestId('panel');
        expect(panels[0].getAttribute('data-default-size')).toBe(String(minimumWorkspacePaneSizes[0]));
        expect(panels[2].getAttribute('data-default-size')).toBe(String(minimumWorkspacePaneSizes[2]));
    });
});
