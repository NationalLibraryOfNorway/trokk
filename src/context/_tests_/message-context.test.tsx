import {fireEvent, render, screen} from '@testing-library/react';
import {MessageProvider, useMessage} from '../message-context.tsx';
import {TextItemResponse} from '../../model/text-input-response.ts';
import {MaterialType, PublicationType} from '../../model/registration-enums.ts';
import '@testing-library/jest-dom';



beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    (console.error as jest.Mock).mockRestore();
});

jest.mock('../transfer-log-context.tsx', () => ({
    useTransferLog: () => ({
        addLog: jest.fn(),
    }),
}));

jest.mock('../post-registration-context.tsx', () => ({
    usePostRegistration: jest.fn(() => Promise.resolve({ success: true })),
}));

const renderWithProvider = () =>
    render(
        <MessageProvider>
            <TestComponent />
        </MessageProvider>
    );

const click = (text: string) => fireEvent.click(screen.getByText(text));

const TestComponent = () => {
    const {
        errorMessage,
        successMessage,
        handleError,
        handleSuccessMessage,
        displaySuccessMessage,
        removeMessages,
        clearError,
    } = useMessage();

    const mockItem = new TextItemResponse(
        '123',
        MaterialType.MONOGRAPH,
        PublicationType.MONOGRAPHIC,
        { id: '123', tempName: 'mock-file-name' },
        { id: '123', numberOfPages: '3' }
    );

    return (
        <div>
            <button onClick={() => handleError('Extra info', 404)}>Trigger Error</button>
            <button onClick={() => handleSuccessMessage('It worked!')}>Trigger Success</button>
            <button onClick={() => displaySuccessMessage(mockItem)}>Display Success</button>
            <button onClick={removeMessages}>Remove Messages</button>
            <button onClick={clearError}>Clear Error</button>

            {errorMessage && <div data-testid="error">{errorMessage}</div>}
            {successMessage && <div data-testid="success">{successMessage}</div>}
        </div>
    );
};

describe('MessageContext', () => {
    test('sets and clears error message', () => {
        renderWithProvider();

        click('Trigger Error');
        expect(screen.getByTestId('error')).toHaveTextContent(
            'Kunne ikke TRØKKE dette videre. Extra info Kontakt tekst-teamet om problemet vedvarer. (Feilkode 404)'
        );
        expect(screen.queryByTestId('success')).toBeNull();

        click('Clear Error');
        expect(screen.queryByTestId('error')).toBeNull();
    });

    test('sets and clears success message', () => {
        renderWithProvider();

        click('Trigger Success');
        expect(screen.getByTestId('success')).toHaveTextContent('It worked!');
        expect(screen.queryByTestId('error')).toBeNull();

        click('Remove Messages');
        expect(screen.queryByTestId('success')).toBeNull();
    });

    test('displays success message from TextItemResponse', () => {
        renderWithProvider();

        click('Display Success');
        expect(screen.getByTestId('success')).toHaveTextContent('Item "mock-file-name" sendt til produksjonsløypen med id 123');
    });
});
