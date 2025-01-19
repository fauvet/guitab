import { MatIconRegistry } from "@angular/material/icon";
import { DomSanitizer } from "@angular/platform-browser";

export class MaterialIconsUtil {
  private static readonly ICONS: { [key: string]: string } = {
    UNDO: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-200v-80h284q63 0 109.5-40T720-420q0-60-46.5-100T564-560H312l104 104-56 56-200-200 200-200 56 56-104 104h252q97 0 166.5 63T800-420q0 94-69.5 157T564-200H280Z"/></svg>`,
    REDO: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M396-200q-97 0-166.5-63T160-420q0-94 69.5-157T396-640h252L544-744l56-56 200 200-200 200-56-56 104-104H396q-63 0-109.5 40T240-420q0 60 46.5 100T396-280h284v80H396Z"/></svg>`,
    VARIABLE_ADD: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M560-280H120v-400h720v120h-80v-40H200v240h360v80Zm-360-80v-240 240Zm560 200v-120H640v-80h120v-120h80v120h120v80H840v120h-80Z"/></svg>`,
    VARIABLE_INSERT: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M120-280v-400h720v160h-80v-80H200v240h360v80H120Zm80-80v-240 240Zm664 200L720-303v123h-80v-260h260v80H776l144 144-56 56Z"/></svg>`,
    VARIABLE_REMOVE: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M560-280H120v-400h720v120h-80v-40H200v240h360v80Zm-360-80v-240 240Zm440 104 84-84-84-84 56-56 84 84 84-84 56 56-83 84 83 84-56 56-84-83-84 83-56-56Z"/></svg>`,
  };

  static registerIcons(matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer): void {
    for (const iconName in MaterialIconsUtil.ICONS) {
      const svg = MaterialIconsUtil.ICONS[iconName];
      matIconRegistry.addSvgIconLiteral(iconName.toLowerCase(), domSanitizer.bypassSecurityTrustHtml(svg));
    }
  }
}
