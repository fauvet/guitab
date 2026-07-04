import { MatIconRegistry } from "@angular/material/icon";
import { DomSanitizer } from "@angular/platform-browser";
import { MaterialIconsUtil } from "./material-icons.util";

describe("MaterialIconsUtil", () => {
  describe("registerIcons", () => {
    let mockRegistry: { addSvgIconLiteral: ReturnType<typeof vi.fn> };
    let mockSanitizer: { bypassSecurityTrustHtml: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockRegistry = { addSvgIconLiteral: vi.fn() };
      mockSanitizer = { bypassSecurityTrustHtml: vi.fn((html: string) => html) };
    });

    it("should register exactly 6 icons", () => {
      MaterialIconsUtil.registerIcons(
        mockRegistry as unknown as MatIconRegistry,
        mockSanitizer as unknown as DomSanitizer,
      );
      expect(mockRegistry.addSvgIconLiteral).toHaveBeenCalledTimes(6);
    });

    it("should register the 'undo' icon", () => {
      MaterialIconsUtil.registerIcons(
        mockRegistry as unknown as MatIconRegistry,
        mockSanitizer as unknown as DomSanitizer,
      );
      const registeredNames = mockRegistry.addSvgIconLiteral.mock.calls.map((c: any[]) => c[0]);
      expect(registeredNames).toContain("undo");
    });

    it("should register the 'redo' icon", () => {
      MaterialIconsUtil.registerIcons(
        mockRegistry as unknown as MatIconRegistry,
        mockSanitizer as unknown as DomSanitizer,
      );
      const registeredNames = mockRegistry.addSvgIconLiteral.mock.calls.map((c: any[]) => c[0]);
      expect(registeredNames).toContain("redo");
    });

    it("should register the 'folder_open' icon", () => {
      MaterialIconsUtil.registerIcons(
        mockRegistry as unknown as MatIconRegistry,
        mockSanitizer as unknown as DomSanitizer,
      );
      const registeredNames = mockRegistry.addSvgIconLiteral.mock.calls.map((c: any[]) => c[0]);
      expect(registeredNames).toContain("folder_open");
    });

    it("should register all variable icons (variable_add, variable_insert, variable_remove)", () => {
      MaterialIconsUtil.registerIcons(
        mockRegistry as unknown as MatIconRegistry,
        mockSanitizer as unknown as DomSanitizer,
      );
      const registeredNames = mockRegistry.addSvgIconLiteral.mock.calls.map((c: any[]) => c[0]);
      expect(registeredNames).toContain("variable_add");
      expect(registeredNames).toContain("variable_insert");
      expect(registeredNames).toContain("variable_remove");
    });

    it("should use only lowercase icon names", () => {
      MaterialIconsUtil.registerIcons(
        mockRegistry as unknown as MatIconRegistry,
        mockSanitizer as unknown as DomSanitizer,
      );
      const registeredNames = mockRegistry.addSvgIconLiteral.mock.calls.map((c: any[]) => c[0]);
      registeredNames.forEach((name: string) => {
        expect(name).toBe(name.toLowerCase());
      });
    });

    it("should call bypassSecurityTrustHtml once per icon", () => {
      MaterialIconsUtil.registerIcons(
        mockRegistry as unknown as MatIconRegistry,
        mockSanitizer as unknown as DomSanitizer,
      );
      expect(mockSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledTimes(6);
    });

    it("should pass SVG strings to bypassSecurityTrustHtml", () => {
      MaterialIconsUtil.registerIcons(
        mockRegistry as unknown as MatIconRegistry,
        mockSanitizer as unknown as DomSanitizer,
      );
      mockSanitizer.bypassSecurityTrustHtml.mock.calls.forEach((call: any[]) => {
        expect(call[0]).toContain("<svg");
      });
    });
  });
});
