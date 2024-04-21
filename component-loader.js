function extractScriptContents(componentContent) {
  const regex = /<script.*?>([\s\S]*?)<\/script>/gi;
  const scripts = [];
  let match;

  while ((match = regex.exec(componentContent)) !== null) {
    scripts.push(match[1]);
  }

  return scripts;
}

document.addEventListener("DOMContentLoaded", async function () {
  const components = document.getElementsByTagName("component");

  for (const component of components) {
    const htmlFilePath = component.attributes.src.value;
    const response = await fetch(htmlFilePath);
    const componentContent = await response.text();
    component.insertAdjacentHTML("afterend", componentContent);

    const scriptContents = extractScriptContents(componentContent);

    for (const scriptContent of scriptContents) {
      const script = document.createElement("script");
      script.textContent = scriptContent;
      document.head.appendChild(script);
    }

    component.remove();
  }
});
