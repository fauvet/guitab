import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { Subject, takeUntil } from "rxjs";
import { User } from "firebase/auth";
import { AuthService } from "../../services/auth/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly unsubscribe$ = new Subject<void>();

  user: User | null = null;
  isSigningIn = false;

  ngOnInit(): void {
    this.authService
      .getUser$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((user) => {
        this.user = user;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  onSignIn(): void {
    if (this.isSigningIn) return;
    this.isSigningIn = true;
    this.cdr.markForCheck();
    this.authService
      .signInWithGoogle()
      .catch((err) => {
        console.error("[Login] Sign-in error:", err);
        this.snackBar.open("Sign-in failed. Please try again.", "Dismiss", { duration: 5000 });
      })
      .finally(() => {
        this.isSigningIn = false;
        this.cdr.markForCheck();
      });
  }

  onSignOut(): void {
    this.authService.signOut().catch((err) => {
      console.error("[Login] Sign-out error:", err);
      this.snackBar.open("Sign-out failed. Please try again.", "Dismiss", { duration: 5000 });
    });
  }
}
