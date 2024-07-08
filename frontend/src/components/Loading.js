import React from "react";

export function Loading( { message } ) {
  return ( <div className="container"><article><span aria-busy="true">{message}</span></article></div>
  );
}
