package interfaces

import (
	"context"
	"fmt"
	"github.com/golang/protobuf/proto"
	"ide/internal/code_indexer/services/pipeline"
	"ide/internal/interfaces"
)

type inverseIndexer struct {
	builder interfaces.InverseProtoBuilderService
	storage interfaces.InverseIndexStorage
	pool    pipeline.Pool
}


type InverseProtoBuilderService interface {
	BuildInverseIndexProto(
		ctx context.Context, values []IrIndexResult, changes entities.FileChanges,
	) (InverseIndexProto, error)
}


func newInverseIndexerService(
	builder interfaces.InverseProtoBuilderService, storage interfaces.InverseIndexStorage, pool pipeline.Pool,
) interfaces.InverseIndexerService {
	return &inverseIndexer{
		builder: builder,
		storage: storage,
		pool:    pool,
	}
}

