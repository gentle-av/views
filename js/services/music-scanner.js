class MusicScanner {
  constructor(apiBaseUrl = "") {
    this.apiBaseUrl = apiBaseUrl;
    this.confirmDialog = new ConfirmDialog();
    this.statusElement = null;
  }

  setStatusElement(element) {
    this.statusElement = element;
  }

  async forceRescan() {
    this.showStatus("Обновление базы данных...", "orange");
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/music/force-rescan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await response.json();
      if (data.status === "success") {
        this.showStatus(`Обновление запущено в фоне`, "green");
        setTimeout(() => this.hideStatus(), 3000);
      } else {
        this.showStatus(`Ошибка: ${data.message}`, "red");
      }
    } catch (error) {
      this.showStatus(`Ошибка: ${error.message}`, "red");
    }
  }

  showStatus(message, color) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
      this.statusElement.style.color = color;
      this.statusElement.style.display = "block";
    }
  }

  hideStatus() {
    if (this.statusElement) {
      this.statusElement.style.display = "none";
    }
  }

  attachToButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.onclick = () => {
        this.confirmDialog.show(
          "ВНИМАНИЕ! Это действие полностью перезапишет базу данных музыки.\nБудут удалены все существующие записи и выполнено полное сканирование директории.\nПродолжить?",
          () => this.forceRescan(),
          () => console.log("Обновление отменено"),
        );
      };
    }
  }
}
