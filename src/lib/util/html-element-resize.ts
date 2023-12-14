interface Position {
    x: number
    y: number
}

interface SimpleRect {
    width: number;
    left: number;
    right: number;
}

interface ResizeableHTMLDivElement extends HTMLDivElement {
    side?: 'left' | 'right';
}

export const move = (element: HTMLElement) => {
    return {
        destroy() {
        }
    }
}

export const resize = (element: HTMLElement) => {
    const grabRightElement: ResizeableHTMLDivElement = document.createElement('div')
    grabRightElement.side = 'right'
    grabRightElement.classList.add('grabber', 'right')
    grabRightElement.addEventListener('mousedown', onMousedown)
    element.appendChild(grabRightElement)

    const grabLeftElement: ResizeableHTMLDivElement = document.createElement('div')
    grabLeftElement.side = 'left'
    grabLeftElement.classList.add('grabber', 'left')
    grabLeftElement.addEventListener('mousedown', onMousedown)
    element.appendChild(grabLeftElement)

    let active: ResizeableHTMLDivElement | null = null
    let initialPosition: Position = { x: 0, y: 0 }
    let initialWidth: SimpleRect = { width: 0, left: 0, right: 0 }

    function onMousedown(event: MouseEvent) {
        active = event.target as ResizeableHTMLDivElement
        if (!active) return
        const rect = element.getBoundingClientRect()
        const parent = element.parentElement?.getBoundingClientRect() || new DOMRect(0, 0, 0, 0)

        initialWidth = {
            width: rect.width,
            left: rect.left - parent.left,
            right: rect.right - parent.right
        }
        initialPosition = { x: event.pageX, y: event.pageY }
    }

    function onMouseup() {
        if (!active) return
        active = null
        initialPosition = { x: 0, y: 0 }
        initialWidth = { width: 0, left: 0, right: 0 }
    }

    function onMove(event: MouseEvent) {
        if (!active) return
        let delta = 0;

        if (active.side === 'right') {
            delta = event.pageX - initialPosition.x
            element.style.right = `${initialWidth.right - delta}px`
            element.style.width = `${initialWidth.width + delta}px`
        }
        else if (active.side === 'left') {
            delta = initialPosition.x - event.pageX
            element.style.left = `${initialWidth.left - delta}px`
            element.style.width = `${initialWidth.width + delta}px`
        }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onMouseup)

    return {
        destroy() {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mousemove', onMousedown)
            element.removeChild(grabRightElement)
            element.removeChild(grabLeftElement)
        }
    }
}