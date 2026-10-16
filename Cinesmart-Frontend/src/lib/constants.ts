// Layout classes shared by skeletons and the real rows/grids so loading states match ([DS-3]).

/** Card gap: 8px mobile / 12px tablet / 16px desktop. */
export const CARD_GAP_CLASS = 'gap-2 sm:gap-3 lg:gap-4';

/** Row card width: 2.4 visible on mobile, 4.3 on tablet, 6 on desktop, 7 on xl. */
export const ROW_CARD_WIDTH_CLASS =
  'w-[40%] shrink-0 sm:w-[23%] lg:w-[calc((100%-5*1rem)/6)] xl:w-[calc((100%-6*1rem)/7)]';

/** Grid columns: 2 / 3 (md: 4) / 5 (xl: 6). */
export const GRID_COLUMNS_CLASS =
  'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
