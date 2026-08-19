import { AsyncPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { NotificationService } from "../../services/notification/notification.service";
import { MatTooltipModule } from "@angular/material/tooltip";
import { BehaviorSubject, filter, Observable, Subject, takeUntil } from "rxjs";
import type { User } from "firebase/auth";
import { AuthService } from "../../services/auth/auth.service";

@Component({
  selector: "app-login",
  imports: [AsyncPipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly unsubscribe$ = new Subject<void>();

  // Both values reach the template through `| async`, which subscribes,
  // unsubscribes on destroy and marks the view for check on every emission.
  // Doing it by hand meant a subscription to tear down and three
  // `ChangeDetectorRef.markForCheck()` calls to remember.
  readonly isSigningIn$ = new BehaviorSubject<boolean>(false);

  ngOnInit(): void {
    // Anonymous sign-in happens inside AuthService's constructor, so this is
    // the only place its failure can reach the user — without it the app
    // silently stays signed out with no indication anything went wrong.
    this.authService
      .getSignInError$()
      .pipe(
        filter((error): error is Error => error !== null),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((error) => {
        console.error(error);
        this.notificationService.showError("Couldn't connect to sign-in. Check your connection and try again later.");
      });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

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
        this.notificationService.showError("Sign-in failed. Please try again.");
      })
      .finally(() => this.isSigningIn$.next(false));
  }

  onSignOut(): void {
    this.authService.signOut().catch((error: unknown) => {
      console.error("[Login] Sign-out error:", error);
      this.notificationService.showError("Sign-out failed. Please try again.");
    });
  }
}
