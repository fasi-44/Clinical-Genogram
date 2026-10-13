# Angular Demo

To set up the Angular demo:

1. `ng new angular-demo` in this directory
2. Install: `npm install clinical-genogram`
3. Add `CUSTOM_ELEMENTS_SCHEMA` to your module
4. Import `defineCustomElements` from `clinical-genogram/loader` in `main.ts`
5. Use `<clinical-genogram>` in your templates