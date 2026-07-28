import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { Subject, takeUntil } from "rxjs";
import { User } from "firebase/auth";
import { AuthService } from "../../services/auth/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  private readonly unsubscribe$ = new Subject<void>();

  user: User | null = null;

  ngOnInit(): void {
    this.authService
      .getUser$()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((user) => (this.user = user));
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  onSignIn(): void {
    this.authService.signInWithGoogle().catch((err) => console.error("[Login] Sign-in error:", err));
  }

  onSignOut(): void {
    this.authService.signOut().catch((err) => console.error("[Login] Sign-out error:", err));
  }
}
