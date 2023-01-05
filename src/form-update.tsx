import { html } from "hono/html";

const Row = (props: { judul: string; id: string; value: string }) => html`
  <p style="margin-bottom:0.5rem;margin-top:0;">
    <label style="font-family:sans-serif;font-size:.85rem">
      <span style="display:inline-block; width:110px;">${props.judul}:</span>
      <input
        id="${props.id}"
        name="${props.id}"
        type="text"
        value="${props.value}"
        style="font-size:0.9rem;padding:4px;" />
    </label>
  </p>
`;

export interface FormData {
  id: string;
  npwpNomor: string;
  npwpNama: string;
  npwpAlamat: string;
  npwpKota: string;
}

export const FormContent = (props: { data: FormData }) => (
  <div style="display:flex;">
    <div style="flex-shrink:0;">
      <input type="hidden" id="id" name="id" value={props.data.id} />
      <Row value={props.data.npwpNomor} id="npwpNomor" judul="Nomor NPWP" />
      <Row value={props.data.npwpNama} id="npwpNama" judul="Nama Lengkap" />
      <Row value={props.data.npwpAlamat} id="npwpAlamat" judul="Alamat" />
      <Row value={props.data.npwpKota} id="npwpKota" judul="Kota" />
      <p style="margin-bottom:0.5rem;margin-top:16px;">
        <label style="font-family:sans-serif;font-size:.85rem">
          <span style="display:inline-block; width:120px;"></span>
          <button
            type="submit"
            style="margin-left:5px;font-size:.9rem;font-weight:700;padding:6px 16px;">
            Submit
          </button>
          <span style="margin-left:10px;font-size:20px">💋</span>
        </label>
      </p>
    </div>
    <div style="padding-left:20px;overflow-x:scroll;">
      <pre id="pre" style="font-size:12px;margin:0;color:#c4a;overflow:auto;">
        LSOS
      </pre>
    </div>
  </div>
);

export const formScript = html`
  <script>
    async function submit(e) {
      e.preventDefault();
      // ===============================
      const url = "/api/tenant/clients";
      // ===============================
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          id: id.value,
          data: {
            npwpNomor: npwpNomor.value,
            npwpNama: npwpNama.value,
            npwpAlamat: npwpAlamat.value,
            npwpKota: npwpKota.value,
          },
        }),
      });
      if (response.ok) {
        const str = await response.json();
        pre.textContent = JSON.stringify(str, null, 2);
      }
    }
    const form = document.getElementById("form");
    form.addEventListener("submit", submit);

    const id = document.getElementById("id");
    const pre = document.getElementById("pre");
    const npwpNomor = document.getElementById("npwpNomor");
    const npwpNama = document.getElementById("npwpNama");
    const npwpAlamat = document.getElementById("npwpAlamat");
    const npwpKota = document.getElementById("npwpKota");

    const smile = "💋";
  </script>
`;

export const FormUpdate = (props: { children?: any }) => html`
<html>
<head>
  <meta charset="UTF-8">
  <title>FormLayout</title>
  <head prefix="og: http://ogp.me/ns#">
  <!-- More elements slow down JSX, but not template literals. -->
</head>
<body style="padding:1rem">
  <h2>Honoco &amp; Ro Kodo</h2>
  <form id="form" method="post">
  ${props.children}
  </form>
</body>
</html>
`;

//
