import { useEffect, useCallback, useRef } from 'react';

interface InfiniteScrollOptions {
    hasNext: boolean;
    isLoading: boolean;
    onLoadMore: () => void;
    threshold?: number;
    debounceMs?: number;
}

export function useInfiniteScroll({
    hasNext,
    isLoading,
    onLoadMore,
    threshold = 0.5,
    debounceMs = 300
}: InfiniteScrollOptions) {
    const observer = useRef<IntersectionObserver | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lastElementRef = useCallback(
        (node: HTMLElement | null) => {
            if (isLoading) return;

            if (observer.current) observer.current.disconnect();

            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasNext) {
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);

                    timeoutRef.current = setTimeout(() => {
                        onLoadMore();
                    }, debounceMs);
                }
            }, {
                threshold
            });

            if (node) observer.current.observe(node);
        },
        [isLoading, hasNext, onLoadMore, threshold, debounceMs]
    );

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return { lastElementRef };
}
