import { Component, OnInit } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { AppContextService } from "../app-context.service";
import { ToastrService } from "ngx-toastr";
import { ChordproEditorComponent } from "../chordpro-editor/chordpro-editor.component";

@Component({
  selector: "app-actions-bar",
  standalone: true,
  imports: [MatIconModule],
  templateUrl: "./actions-bar.component.html",
  styleUrl: "./actions-bar.component.css",
})
export class ActionsBarComponent implements OnInit {
  constructor(
    private appContextService: AppContextService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        this.onButtonSaveFileClicked();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        this.onButtonPlayClicked();
      }
    });
  }

  async onButtonOpenFileClicked(): Promise<void> {
    const filePicker = await window.showOpenFilePicker({
      types: [
        {
          description: "ChordPro",
          accept: {
            "text/plain": [".cho", ".crd", ".chopro", ".chord", ".pro"],
          },
        },
      ],
      multiple: false,
    });
    const fileHandle = filePicker[0];
    this.appContextService.setFileHandle(fileHandle);
  }

  async onButtonSaveFileClicked(): Promise<void> {
    const fileHandle = this.appContextService.getFileHandle();
    if (!fileHandle) {
      this.toastr.error("Unable to save");
      return;
    }

    const writable = await fileHandle.createWritable();
    const editorContent = ChordproEditorComponent.getEditorContent();
    await writable.write(editorContent);
    await writable.close();
    const fileName = fileHandle.name;
    this.toastr.success(`${fileName} saved`);
  }

  async onButtonPlayClicked(): Promise<void> {
    this.appContextService.updateRender();
  }

  onButtonEditClicked() {}

  onButtonHistoryClicked() {}

  onButtonZoomInClicked() {
    // const zoom = getZoom();
    // const newZoom = zoom * 1.1;
    // setZoom(newZoom);
  }

  onButtonZoomOutClicked() {
    // const zoom = getZoom();
    // const newZoom = zoom * 0.9;
    // setZoom(newZoom);
  }

  setZoom(zoom: number) {
    // if (zoom < 25) zoom = 25;
    // if (zoom > 500) zoom = 500;
    // if (!/%$/.test(zoom)) zoom += "%";
    // document.body.style.zoom = zoom;
  }

  getZoom() {
    // return (document.body.style.zoom || "100%").replace(/%$/, "");
  }
}
