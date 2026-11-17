# terms.js — source fragments

The browser receives these files joined in the order below as `/js/terms.js`, between `_open.txt` (the file header and the opening of the wrapper function) and `_close.txt` (its closing line).
The English clinical terms shown in the room's Arabic text.


| file | legacy lines | layer | responsibility |
|---|---|---|---|
| 010-vocabulary.js | 10–49 | domain | TERMS table |
| 020-translate.js | 50–110 | presentation | regex, skip list, translate, walk |
| 030-boot.js | 111–126 | browser | boot and body observer |
