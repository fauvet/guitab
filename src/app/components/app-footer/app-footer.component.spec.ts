import { ComponentFixture, TestBed } from "@angular/core/testing";
import packageJson from "../../../../package.json";
import { AppFooterComponent } from "./app-footer.component";

describe("AppFooterComponent", () => {
  let component: AppFooterComponent;
  let fixture: ComponentFixture<AppFooterComponent>;

  const queryLinkByText = (text: RegExp): HTMLAnchorElement | undefined =>
    Array.from(fixture.nativeElement.querySelectorAll("a") as NodeListOf<HTMLAnchorElement>).find((anchor) =>
      text.test(anchor.textContent ?? ""),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppFooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should link to the source code repository", () => {
    const link = queryLinkByText(/source/i);

    expect(link?.getAttribute("href")).toBe("https://github.com/fauvet/guitab");
  });

  it("should link to the licence file rather than naming it only", () => {
    const link = queryLinkByText(/licen[cs]e/i);

    expect(link?.getAttribute("href")).toBe("https://github.com/fauvet/guitab/blob/main/LICENSE");
  });

  it("should announce the GPL licence, since the app is no longer MIT", () => {
    const link = queryLinkByText(/licen[cs]e/i);

    expect(link?.textContent).toContain("GPL-3.0");
  });

  it("should link to the issue tracker so a user can report a bug", () => {
    const link = queryLinkByText(/bug|issue/i);

    expect(link?.getAttribute("href")).toBe("https://github.com/fauvet/guitab/issues/new");
  });

  it("should open external links safely in a new tab", () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll("a") as NodeListOf<HTMLAnchorElement>);

    links.forEach((link) => {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    });
  });

  it("should show the version declared in package.json rather than a hardcoded one", () => {
    expect(fixture.nativeElement.textContent).toContain(packageJson.version);
  });

  it("should give the link group an accessible name", () => {
    const navigation = fixture.nativeElement.querySelector("nav") as HTMLElement | null;

    expect(navigation?.getAttribute("aria-label")).toBeTruthy();
  });
});
