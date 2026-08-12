import { AsyncPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { BehaviorSubject, Observable } from "rxjs";
import type { User } from "firebase/auth";
import { AuthService } from "../../services/auth/auth.service";

@Component({
  selector: "app-login",
  imports: [AsyncPipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  // Both values reach the template through `| async`, which subscribes,
  // unsubscribes on destroy and marks the view for check on every emission.
  // Doing it by hand meant a subscription to tear down and three
  // `ChangeDetectorRef.markForCheck()` calls to remember.
  readonly isSigningIn$ = new BehaviorSubject<boolean>(false);

  getUser$(): Observable<User | null> {
    return this.authService.getUser$();
  }

  onSignIn(): void {
    if (this.isSigningIn$.getValue()) return;

    this.isSigningIn$.next(true);
    this.authService
      .signInWithGoogle()
      .catch((error: unknown) => {
        console.error("[Login] Sign-in error:", error);
        this.snackBar.open("Sign-in failed. Please try again.", "Dismiss", { duration: 5000 });
      })
      .finally(() => this.isSigningIn$.next(false));
  }

  onSignOut(): void {
    this.authService.signOut().catch((error: unknown) => {
      console.error("[Login] Sign-out error:", error);
      this.snackBar.open("Sign-out failed. Please try again.", "Dismiss", { duration: 5000 });
    });
  }
}
