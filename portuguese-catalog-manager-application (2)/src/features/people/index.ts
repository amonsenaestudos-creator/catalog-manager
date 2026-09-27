/** API pública de pessoas; a implementação legada pode mudar sem espalhar imports. */
export { getDefaultPerson, calculateOverallRating, completeness, isActive, locationLabel } from '../../store';
export type { Person, Rating, Vinculo } from '../../types';
