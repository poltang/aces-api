import { html } from "hono/html";

export const FormLayout = (props: { children?: any }) => html`
<html>
<head>
  <meta charset="UTF-8">
  <title>FormLayout</title>
  <head prefix="og: http://ogp.me/ns#">
  <!-- More elements slow down JSX, but not template literals. -->
</head>
<body>
  <h2>Honocoro Ko</h2>
  <form id="form" method="post">
  ${props.children}
  </form>
</body>
</html>
`;

export const FormContent = () => (
  <div>
    <Row id="npwpNomor" judul="Nomor NPWP" />
    <Row id="npwpNama" judul="Nama Lengkap" />
    <Row id="npwpAlamat" judul="Alamat" />
    <Row id="npwpKota" judul="Kota" />
    <p style="margin-bottom:0.5rem;margin-top:16px;">
      <label style="font-family:sans-serif;font-size:.85rem">
        <span style="display:inline-block; width:120px;"></span>
        <button
          type="submit"
          style="margin-left:5px;font-size:.9rem;font-weight:700;padding:6px 16px;">
          Submit
        </button>
      </label>
    </p>
  </div>
);

interface RowProps {
  id: string;
  judul: string;
}
export const Row = (props: RowProps) => html`
  <p style="margin-bottom:0.5rem;margin-top:0;">
    <label style="font-family:sans-serif;font-size:.85rem">
      <span style="display:inline-block; width:120px;">${props.judul}:</span>
      <input
        id="${props.id}"
        name="${props.id}"
        type="text"
        value=""
        style="font-size:0.9rem;padding:4px;" />
    </label>
  </p>
`;

export const fscript = html`
  <script>
    async function submit(event) {
      //
    }
    const form = document.getElementById("form");
    form.addEventListener("submit", submit);
  </script>
`;

// export FormCX =

// TODO
