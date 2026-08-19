import { ChangeDetectionStrategy, Component } from "@angular/core";
import packageJson from "../../../../package.json";

/**
 * The repository URL is read from package.json rather than typed here.
 *
 * package.json is already the copy npm, GitHub and the deploy workflow read,
 * and the version is bumped there. A second copy inside src/ would be the one
 * nobody remembers to update — exactly the drift hard rule 7 of CLAUDE.md
 * exists to prevent.
 *
 * npm stores the clone URL (`git+https://….git`); a browser needs the page.
 */
const REPOSITORY_URL = packageJson.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");

@Component({
  selector: "app-app-footer",
  imports: [],
  templateUrl: "./app-footer.component.html",
  styleUrl: "./app-footer.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppFooterComponent {
  readonly sourceUrl = REPOSITORY_URL;
  readonly licenseUrl = `${REPOSITORY_URL}/blob/main/LICENSE`;
  readonly issuesUrl = `${REPOSITORY_URL}/issues/new`;
  readonly version = packageJson.version;
}
