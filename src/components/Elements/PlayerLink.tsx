import { FunctionComponent } from "react";
import Link from "next/link";

export const PlayerLink: FunctionComponent<{ name: string }> = ({ name }) => (
  <Link
    href={`/players/${encodeURIComponent(name)}`}
    className="hover:underline capitalize"
  >
    {name}
  </Link>
);
