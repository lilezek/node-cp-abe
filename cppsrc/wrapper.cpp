#include <node.h>
#include <node_buffer.h>
#include <v8.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <unistd.h>
#include <string>
#include <iostream>

#include <glib.h>
#include <pbc.h>


extern "C" {
  #include <common.h>
  #include <bswabe.h>
  #include <policy_lang.h>
}


using namespace std;

GByteArray * BufferToByteArray(const v8::Local<v8::Value> & b) {
  guint8 * x = (guint8*)malloc(node::Buffer::Length(b));
  memcpy(x, node::Buffer::Data(b), node::Buffer::Length(b));
  return g_byte_array_new_take(x, node::Buffer::Length(b));
}

v8::Isolate* lastIsolate;
bool _die = false;
char lastError[256];

extern "C" {
  void die(const char * fmt, ...) {
    va_list args;
    va_start(args, fmt);
    int size = vsnprintf(NULL, 0, fmt, args)+1;
    va_end(args);
    lastError[0] = '\0';
    va_start(args, fmt);
    vsnprintf(lastError,size, fmt, args);
    va_end(args);
    _die = true;
  }

  bool isDying() {
    bool x = _die;
    _die = false;
    return x;
  }
}

void
write_cpabe_byte_array( GByteArray * out, GByteArray* cph_buf, int file_len, GByteArray* aes_buf )
{
  size_t total_length = 4+4+aes_buf->len+4+cph_buf->len;
  g_byte_array_set_size(out, total_length);

	int i;
  int j = 0;
  guint8 * buffer = out->data;

	/* write real file len as 32-bit big endian int */
	for(i = 3; i >= 0; i-- )
		buffer[j++] = (file_len & 0xff<<(i*8))>>(i*8);


	/* write aes_buf */
	for( i = 3; i >= 0; i-- )
		buffer[j++] = (aes_buf->len & 0xff<<(i*8))>>(i*8);
	memcpy(&buffer[j], aes_buf->data, aes_buf->len);
  j += aes_buf->len;

	/* write cph_buf */
	for( i = 3; i >= 0; i-- )
		buffer[j++] = (cph_buf->len & 0xff<<(i*8))>>(i*8);
	memcpy(&buffer[j], cph_buf->data, cph_buf->len);
  j += cph_buf->len;
}

void
read_cpabe_byte_array(GByteArray* dataArray,GByteArray** cph_buf,int* file_len, GByteArray** aes_buf){
    int i,offset = 0;
    int len;

    *cph_buf = g_byte_array_new();
    *aes_buf = g_byte_array_new();

    // read real file len as 32-bit big endian int
    *file_len = 0;
    for( i = 3; i >= 0; i--,offset++ )
        *file_len |= dataArray->data[offset]<<(i*8);

    // read aes buf
    len = 0;
    for( i = 3; i >= 0; i-- ,offset++)
        len |= dataArray->data[offset]<<(i*8);
    g_byte_array_append(*aes_buf,dataArray->data+offset , len);
    offset +=len;

    // read cph buf
    len = 0;
    for( i = 3; i >= 0; i-- ,offset++)
        len |= dataArray->data[offset]<<(i*8);
    g_byte_array_append(*cph_buf,dataArray->data+offset , len);
    offset +=len;
}

static void GByteArray_FreeCallback(char* data, void* hint) {
  g_byte_array_free((GByteArray*)hint,1);
}

// No arguments
void cpabe_setup(const v8::FunctionCallbackInfo<v8::Value>& args){
  v8::Isolate* isolate = args.GetIsolate();

	bswabe_pub_t* pub;
	bswabe_msk_t* msk;

	//Genera las los pares de claves maestra y publica
	bswabe_setup(&pub,&msk);

	GByteArray * gpub = bswabe_pub_serialize(pub);
	GByteArray * gmast = bswabe_msk_serialize(msk);

  v8::Local<v8::Object> ret = v8::Object::New(isolate);
  ret->Set(v8::String::NewFromUtf8(isolate, "pubkey"),
    node::Buffer::New(
          isolate,
          (char*)gpub->data,
          gpub->len,
          GByteArray_FreeCallback,
          gpub).ToLocalChecked()
    );

  ret->Set(v8::String::NewFromUtf8(isolate, "mstkey"),
    node::Buffer::New(
          isolate,
          (char*)gmast->data,
          gmast->len,
          GByteArray_FreeCallback,
          gmast).ToLocalChecked()
    );

  args.GetReturnValue().Set(ret);
}

// First argument Buffer, public key
// Second argument string, policy
// Third argument Buffer, data
void cpabe_encryptMessage(const v8::FunctionCallbackInfo<v8::Value>& args)
{
  v8::Isolate* isolate = args.GetIsolate();
	bswabe_pub_t* pub;
	bswabe_cph_t* cph;
	GByteArray* plt;
	GByteArray* cph_buf;
	GByteArray* aes_buf;
	GByteArray* out_buf;
	element_t m;

  if (args.Length() != 3) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Three arguments are required")));
    return;
  }

  if (!node::Buffer::HasInstance(args[0])) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "First argument must be a Buffer of public key.")));
    return;
  }

  if (!args[1]->IsString()) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Second argument must be a string with policies")));
    return;
  }

  if (!node::Buffer::HasInstance(args[2])) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Third argument must be a Buffer containing the data to cipher")));
    return;
  }

  v8::String::Utf8Value sentence(args[1]->ToString());
  char * policies = *sentence;

	char * policy = parse_policy_lang(policies);
  if (isDying()) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, lastError)));
    return;
  }

  GByteArray * struct_pub = g_byte_array_new_take((guint8*)node::Buffer::Data(args[0]), node::Buffer::Length(args[0]));
  pub = bswabe_pub_unserialize(struct_pub, 0);
  g_byte_array_free(struct_pub, 0);

  if (cph = bswabe_enc(pub, m, policy)) {
    plt = BufferToByteArray(args[2]);
    int size = plt->len;
    cph_buf = bswabe_cph_serialize(cph);

		aes_buf = (GByteArray*) aes_128_cbc_encrypt(plt, m);
		element_clear(m);

		out_buf = g_byte_array_new();
		write_cpabe_byte_array(out_buf, cph_buf, size, aes_buf);

		g_byte_array_free(aes_buf, 1);
    g_byte_array_free(cph_buf, 1);
    g_byte_array_free(plt, 1);

    args.GetReturnValue().Set(node::Buffer::New(
            isolate,
            (char*)out_buf->data,
            out_buf->len,
            GByteArray_FreeCallback,
            out_buf).ToLocalChecked()
      );
  } else {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, bswabe_error())));
    return;
  }

  free(policy);
}

// First argument Buffer, public key
// Second argument Buffer, master key
// Third argument array of strings, attributes
void cpabe_keygen(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::Isolate* isolate = args.GetIsolate();

	bswabe_pub_t* pub;
	bswabe_msk_t* msk;
	bswabe_prv_t* prv;

  if (args.Length() != 3) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Three arguments are required")));
    return;
  }

  if (!node::Buffer::HasInstance(args[0])) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "First argument must be a Buffer of public key.")));
    return;
  }

  if (!node::Buffer::HasInstance(args[1])) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Second argument must be a Buffer of master key.")));
    return;
  }

  if (!args[2]->IsArray()) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Third argument must be an array containing the attributes")));
    return;
  }

  v8::Local<v8::Array> arr = args[2].As<v8::Array>();

  int num_attr = arr->Length();
  GSList* alist = 0;
  int i;
  for (i = 0; i < num_attr; i++) {
    v8::String::Utf8Value sentence(arr->Get(i)->ToString());
    parse_attribute(&alist, *sentence);
    if (isDying()) {
      isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, lastError)));
      return;
    }
  }

  int total_attr_num = g_slist_length(alist);
  char** attr = (char**)calloc(sizeof(char*), total_attr_num + 1);

  i = 0;
  for (GSList* ap = alist; ap; ap = ap->next, i++) {
    attr[i] = (char*)ap->data;
  }
  attr[total_attr_num] = nullptr;

  GByteArray * struct_pub = g_byte_array_new_take((guint8*)node::Buffer::Data(args[0]), node::Buffer::Length(args[0]));
  pub = bswabe_pub_unserialize(struct_pub, 0);
  g_byte_array_free(struct_pub, 0);

  GByteArray * struct_mst = g_byte_array_new_take((guint8*)node::Buffer::Data(args[1]), node::Buffer::Length(args[1]));
  msk = bswabe_msk_unserialize(pub, struct_mst, 0);
  g_byte_array_free(struct_mst, 0);

  if (pub && msk) {
    prv = bswabe_keygen(pub, msk, attr);
    GByteArray * prv_serial = bswabe_prv_serialize(prv);
    bswabe_prv_free(prv);

    args.GetReturnValue().Set(node::Buffer::New(
            isolate,
            (char*)prv_serial->data,
            prv_serial->len,
            GByteArray_FreeCallback,
            prv_serial).ToLocalChecked()
      );
  } else {
    // Throw something
  }

  bswabe_pub_free(pub);
}

// First argument Buffer, public key
// Second argument string, priv key
// Third argument Buffer, data
void cpabe_decryptMessage(const v8::FunctionCallbackInfo<v8::Value>& args)
{
  v8::Isolate* isolate = args.GetIsolate();
  bswabe_pub_t* pub;
  bswabe_prv_t* prv;
  bswabe_cph_t* cph;
  int file_len;
	GByteArray* aes_buf,*pub_buf,*priv_buf, *in_data;
	GByteArray* plt;
	GByteArray* cph_buf;
	element_t m;

  if (args.Length() != 3) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Three arguments are required")));
    return;
  }

  if (!node::Buffer::HasInstance(args[0])) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "First argument must be a Buffer of public key.")));
    return;
  }

  if (!node::Buffer::HasInstance(args[1])) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Second argument must be a Buffer of private key")));
    return;
  }

  if (!node::Buffer::HasInstance(args[2])) {
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Third argument must be a Buffer containing the data to cipher")));
    return;
  }


  GByteArray * struct_pub = g_byte_array_new_take((guint8*)node::Buffer::Data(args[0]), node::Buffer::Length(args[0]));
  pub = bswabe_pub_unserialize(struct_pub, 0);
  g_byte_array_free(struct_pub, 0);

  GByteArray * struct_priv = g_byte_array_new_take((guint8*)node::Buffer::Data(args[1]), node::Buffer::Length(args[1]));
  prv = bswabe_prv_unserialize(pub, struct_priv, 0);
  g_byte_array_free(struct_priv, 0);

  in_data = g_byte_array_new_take((guint8*)node::Buffer::Data(args[2]), node::Buffer::Length(args[2]));
  read_cpabe_byte_array(in_data, &cph_buf, &file_len, &aes_buf);
  g_byte_array_free(in_data, 0);

  cph = bswabe_cph_unserialize(pub, cph_buf, 1);

  if( bswabe_dec(pub, prv, cph, m) ){
    plt = (GByteArray*) aes_128_cbc_decrypt(aes_buf, m);
    g_byte_array_set_size(plt, file_len);

    args.GetReturnValue().Set(node::Buffer::New(
            isolate,
            (char*)plt->data,
            file_len,
            GByteArray_FreeCallback,
            plt).ToLocalChecked()
      );
    g_byte_array_free(aes_buf, 1);
    bswabe_cph_free(cph);
  } else {
    g_byte_array_free(aes_buf, 1);
    bswabe_cph_free(cph);
    isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, bswabe_error())));
  }
}

void init(v8::Local<v8::Object> exports) {
  NODE_SET_METHOD(exports, "setup", cpabe_setup);
  NODE_SET_METHOD(exports, "encryptMessage", cpabe_encryptMessage);
  NODE_SET_METHOD(exports, "keygen", cpabe_keygen);
  NODE_SET_METHOD(exports, "decryptMessage", cpabe_decryptMessage);
}

NODE_MODULE(cpabe, init);
