import { TableProps } from "./types";

export default function SQLiteTable(props: {
  title: string;
  results: TableProps[];
}) {
  return (
    <div>
      <style>
        {`
        h2, h3 {
          font-family:monospace;
          font-weight:500;
          margin-bottom:.4rem;
        }
        table {
          border-collapse:collapse;
          font-family: monospace;
        }
        td {
          border: 1px solid #ccc;
          padding: .35rem .5rem;
        }
        `}
      </style>
      <h2>👠 {props.title}</h2>
      <table>
        <tr style="background:#f0f0f0;font-weight:600;">
          <td>cid</td>
          <td>pk</td>
          <td>name</td>
          <td>type</td>
          <td>notnull</td>
          <td>default</td>
        </tr>
        {props.results.map((row) => (
          <tr>
            <td>{row.cid + 1}</td>
            <td>{row.pk}</td>
            <td>{row.name}</td>
            <td>{row.type}</td>
            <td>{row.notnull}</td>
            <td>{row.dflt_value}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
