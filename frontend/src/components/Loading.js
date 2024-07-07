import React from "react";

export function Loading( { message } ) {
  return ( <div class="container"><article><span aria-busy="true">{message}</span></article></div>
  );
}
