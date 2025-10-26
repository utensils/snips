export interface ThemePalette {
  name: string;
  colors: Record<string, string>;
  is_light: boolean;
  icon_theme?: string | null;
  wallpaper?: string | null;
}
