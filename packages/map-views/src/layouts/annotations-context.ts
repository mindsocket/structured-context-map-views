import { createContext, useContext } from 'react';
import type { AnnotationIndex } from '../core/annotations';

const NONE: AnnotationIndex = new Map();

/** The annotations a map view shows, already narrowed by its validation settings. Read by node cards. */
export const AnnotationsContext = createContext<AnnotationIndex>(NONE);

export const useAnnotations = () => useContext(AnnotationsContext);
