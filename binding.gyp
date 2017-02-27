{
  "targets": [{
    "target_name": "cp-abe",
    "sources": [
      "cppsrc/wrapper.cpp",
      "cpabe-0.11/policy_lang.c",
      "cpabe-0.11/common.c"
    ],
    "include_dirs": [
      "cpabe-0.11",
      "libbswabe-0.9",
      "pbc-0.5.14/include",
      "/usr/include/glib-2.0/",
      "/usr/lib/x86_64-linux-gnu/glib-2.0/include"
    ],
    "cflags": [
      "-fPIC",
      "-DDELETE_DIE"
    ],
    "link_settings": {
      "libraries": [
        "<(module_root_dir)/libbswabe-0.9/libbswabe.a",
        "<(module_root_dir)/pbc-0.5.14/.libs/libpbc.so",
        "/lib/x86_64-linux-gnu/libglib-2.0.so.0"
      ]
    }
  }]
}
